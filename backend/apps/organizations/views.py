from rest_framework import serializers, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Organization, OrganizationMembership

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug', 'description', 'created_at']

class OrganizationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        memberships = OrganizationMembership.objects.filter(user=request.user).values_list('organization_id', flat=True)
        orgs = Organization.objects.filter(id__in=memberships)
        return Response(OrganizationSerializer(orgs, many=True).data)

    def post(self, request):
        name = request.data.get('name')
        if not name:
            return Response({'error': 'Name is required.'}, status=400)
        org = Organization.objects.create(name=name, description=request.data.get('description', ''))
        OrganizationMembership.objects.create(organization=org, user=request.user, role=OrganizationMembership.Role.OWNER)
        return Response(OrganizationSerializer(org).data, status=201)
